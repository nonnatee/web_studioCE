import { registry } from "@web/core/registry";
import { reactive } from "@odoo/owl";

export const studioService = {
    dependencies: ["action", "orm"],
    start(env, { action, orm }) {
        const state = reactive({
            studioMode: false,
            activeAction: null,
            activeViewId: null,
            activeViewType: null,
            activeModel: null,
            arch: null,
            fields: {},
            undoStack: [],
            redoStack: [],
            selectedElement: null,
            activeTab: "add",
            pendingFieldCreation: null,
        });

        async function enterStudioMode() {
            const controller = action.currentController;
            if (!controller) {
                console.warn("Studio CE: No active view controller found.");
                return;
            }
            
            const currentAction = controller.action;
            const resModel = controller.props.resModel;
            const viewType = controller.props.type;
            const viewId = controller.props.viewId || false;

            if (!resModel || !['form', 'list'].includes(viewType)) {
                console.warn("Studio CE: Editing is only supported for Form and List views.");
                return;
            }

            try {
                const result = await orm.call("studio.editor", "get_view_arch_and_fields", [], {
                    model_name: resModel,
                    view_id: viewId,
                    view_type: viewType,
                });
                
                state.activeAction = currentAction;
                state.activeModel = resModel;
                state.activeViewId = result.view_id;
                state.activeViewType = viewType;
                state.arch = result.arch;
                state.fields = result.fields;
                state.undoStack = [];
                state.redoStack = [];
                state.selectedElement = null;
                state.studioMode = true;
            } catch (err) {
                console.error("Studio CE: Failed to enter Studio Mode:", err);
            }
        }

        function leaveStudioMode() {
            state.studioMode = false;
            state.activeAction = null;
            state.activeModel = null;
            state.activeViewId = null;
            state.activeViewType = null;
            state.arch = null;
            state.fields = {};
            state.selectedElement = null;
            
            // Re-loads standard view
            action.restore();
        }

        async function pushAction(rpcCall) {
            // Push current state to undo stack
            state.undoStack.push({
                arch: state.arch,
            });
            state.redoStack = [];
            
            try {
                await rpcCall();
                // Refresh architecture
                const result = await orm.call("studio.editor", "get_view_arch_and_fields", [], {
                    model_name: state.activeModel,
                    view_id: state.activeViewId,
                    view_type: state.activeViewType,
                });
                state.arch = result.arch;
                state.selectedElement = null;
            } catch (err) {
                console.error("Studio CE: Action execution failed:", err);
                state.undoStack.pop(); // Revert
            }
        }

        async function undo() {
            if (state.undoStack.length === 0) return;
            const previousState = state.undoStack.pop();
            state.redoStack.push({
                arch: state.arch,
            });
            try {
                // Write previous arch to database customization view
                await orm.write("ir.ui.view", [state.activeViewId], {
                    arch: previousState.arch
                });
                state.arch = previousState.arch;
                state.selectedElement = null;
            } catch (err) {
                console.error("Studio CE: Failed to undo:", err);
            }
        }

        async function redo() {
            if (state.redoStack.length === 0) return;
            const nextState = state.redoStack.pop();
            state.undoStack.push({
                arch: state.arch,
            });
            try {
                await orm.write("ir.ui.view", [state.activeViewId], {
                    arch: nextState.arch
                });
                state.arch = nextState.arch;
                state.selectedElement = null;
            } catch (err) {
                console.error("Studio CE: Failed to redo:", err);
            }
        }

        return {
            get studioMode() { return state.studioMode; },
            get activeAction() { return state.activeAction; },
            get activeViewId() { return state.activeViewId; },
            get activeViewType() { return state.activeViewType; },
            get activeModel() { return state.activeModel; },
            get arch() { return state.arch; },
            get fields() { return state.fields; },
            get undoStack() { return state.undoStack; },
            get redoStack() { return state.redoStack; },
            get selectedElement() { return state.selectedElement; },
            setSelectedElement(el) { 
                state.selectedElement = el; 
                if (el) {
                    state.activeTab = "properties";
                }
            },
            get activeTab() { return state.activeTab; },
            setActiveTab(tab) { state.activeTab = tab; },
            get pendingFieldCreation() { return state.pendingFieldCreation; },
            setPendingFieldCreation(val) { state.pendingFieldCreation = val; },
            
            enterStudioMode,
            leaveStudioMode,
            pushAction,
            undo,
            redo,
        };
    }
};

registry.category("services").add("studio", studioService);
