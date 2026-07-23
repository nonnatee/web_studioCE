import { registry } from "@web/core/registry";
import { reactive } from "@odoo/owl";

export const studioService = {
    dependencies: ["action", "orm", "notification"],
    start(env, { action, orm, notification }) {
        const state = reactive({
            studioMode: false,
            activeAction: null,
            activeViewId: null,
            customViewId: null,
            customArch: null,
            activeViewType: null,
            activeModel: null,
            arch: null,
            fields: {},
            models: {},
            relatedModels: {},
            undoStack: [],
            redoStack: [],
            selectedElement: null,
            activeTab: "add",
            pendingFieldCreation: null,

            async enterStudioMode() {
                const controller = action.currentController;
                if (!controller) {
                    notification.add("Studio CE: No active view controller found to edit.", { type: "warning" });
                    return;
                }
                
                const currentAction = controller.action;
                const resModel = controller.props?.resModel || currentAction?.res_model;
                let viewType = controller.props?.type || controller.viewType || controller.props?.viewType || controller.type;
                if (viewType === "tree") {
                    viewType = "list";
                }
                const viewId = controller.props?.viewId || controller.viewId || false;

                if (!resModel || !['form', 'list', 'kanban'].includes(viewType)) {
                    notification.add(`Studio CE: Editing is only supported for Form, List, and Kanban views (Found: ${viewType}).`, { type: "warning" });
                    return;
                }

                try {
                    const result = await orm.call("studio.editor", "get_view_arch_and_fields", [], {
                        model_name: resModel,
                        view_id: viewId,
                        view_type: viewType,
                    });
                    
                    if (!result || !result.arch) {
                        notification.add(`Studio CE: Could not retrieve view architecture for ${resModel}.`, { type: "danger" });
                        return;
                    }
                    
                    state.activeAction = currentAction;
                    state.activeModel = resModel;
                    state.activeViewId = result.view_id;
                    state.customViewId = result.custom_view_id || false;
                    state.customArch = result.custom_arch || "<data></data>";
                    state.activeViewType = viewType;
                    state.arch = result.arch;
                    state.fields = result.fields || {};
                    const resolvedModels = result.models || result.relatedModels || {};
                    state.models = resolvedModels;
                    state.relatedModels = resolvedModels;
                    state.undoStack = [];
                    state.redoStack = [];
                    state.selectedElement = null;
                    state.studioMode = true;
                } catch (err) {
                    console.error("Studio CE: Failed to enter Studio Mode:", err);
                    notification.add("Studio CE: Failed to load Studio Mode.", { type: "danger" });
                }
            },

            leaveStudioMode() {
                const activeAction = state.activeAction;
                state.studioMode = false;
                state.activeAction = null;
                state.activeModel = null;
                state.activeViewId = null;
                state.customViewId = null;
                state.customArch = null;
                state.activeViewType = null;
                state.arch = null;
                state.fields = {};
                state.models = {};
                state.relatedModels = {};
                state.selectedElement = null;
                
                if (activeAction) {
                    if (typeof action.restore === "function") {
                        action.restore();
                    } else if (typeof action.doAction === "function") {
                        action.doAction(activeAction.id || activeAction, { replaceCurrentAction: true });
                    }
                }
            },

            async pushAction(rpcCall) {
                state.undoStack.push({
                    customArch: state.customArch,
                });
                state.redoStack = [];
                
                try {
                    await rpcCall();
                    const result = await orm.call("studio.editor", "get_view_arch_and_fields", [], {
                        model_name: state.activeModel,
                        view_id: state.activeViewId,
                        view_type: state.activeViewType,
                    });
                    state.arch = result.arch;
                    state.customViewId = result.custom_view_id || false;
                    state.customArch = result.custom_arch || "<data></data>";
                    state.fields = result.fields || {};
                    const resolvedModels = result.models || result.relatedModels || {};
                    state.models = resolvedModels;
                    state.relatedModels = resolvedModels;
                    state.selectedElement = null;
                } catch (err) {
                    console.error("Studio CE: Action execution failed:", err);
                    state.undoStack.pop();
                    notification.add("Studio CE: Could not apply changes.", { type: "danger" });
                }
            },

            async undo() {
                if (state.undoStack.length === 0 || !state.activeViewId) return;
                const previousState = state.undoStack.pop();
                state.redoStack.push({
                    customArch: state.customArch,
                });
                try {
                    await orm.call("studio.editor", "set_custom_view_arch", [], {
                        view_id: state.activeViewId,
                        arch: previousState.customArch,
                    });
                    const result = await orm.call("studio.editor", "get_view_arch_and_fields", [], {
                        model_name: state.activeModel,
                        view_id: state.activeViewId,
                        view_type: state.activeViewType,
                    });
                    state.arch = result.arch;
                    state.customViewId = result.custom_view_id || false;
                    state.customArch = result.custom_arch || "<data></data>";
                    state.fields = result.fields || {};
                    const resolvedModels = result.models || result.relatedModels || {};
                    state.models = resolvedModels;
                    state.relatedModels = resolvedModels;
                    state.selectedElement = null;
                } catch (err) {
                    console.error("Studio CE: Failed to undo:", err);
                    notification.add("Studio CE: Undo failed.", { type: "danger" });
                }
            },

            async redo() {
                if (state.redoStack.length === 0 || !state.activeViewId) return;
                const nextState = state.redoStack.pop();
                state.undoStack.push({
                    customArch: state.customArch,
                });
                try {
                    await orm.call("studio.editor", "set_custom_view_arch", [], {
                        view_id: state.activeViewId,
                        arch: nextState.customArch,
                    });
                    const result = await orm.call("studio.editor", "get_view_arch_and_fields", [], {
                        model_name: state.activeModel,
                        view_id: state.activeViewId,
                        view_type: state.activeViewType,
                    });
                    state.arch = result.arch;
                    state.customViewId = result.custom_view_id || false;
                    state.customArch = result.custom_arch || "<data></data>";
                    state.fields = result.fields || {};
                    const resolvedModels = result.models || result.relatedModels || {};
                    state.models = resolvedModels;
                    state.relatedModels = resolvedModels;
                    state.selectedElement = null;
                } catch (err) {
                    console.error("Studio CE: Failed to redo:", err);
                    notification.add("Studio CE: Redo failed.", { type: "danger" });
                }
            },

            setSelectedElement(el) { 
                state.selectedElement = el; 
                if (el) {
                    state.activeTab = "properties";
                }
            },

            setActiveTab(tab) { state.activeTab = tab; },
            setPendingFieldCreation(val) { state.pendingFieldCreation = val; },

            openFieldCreationModal(type, label, xpath, position) {
                state.pendingFieldCreation = {
                    type,
                    label,
                    xpath,
                    position,
                    fieldName: "x_field_" + Math.random().toString(36).substring(2, 7),
                    fieldLabel: label,
                    fieldRelation: "",
                };
            },

            closeFieldCreationModal() {
                state.pendingFieldCreation = null;
            },
        });

        return state;
    }
};

registry.category("services").add("studio", studioService);

