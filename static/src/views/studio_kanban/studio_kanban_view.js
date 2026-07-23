import { registry } from "@web/core/registry";
import { kanbanView } from "@web/views/kanban/kanban_view";
import { StudioKanbanRenderer } from "./studio_kanban_renderer";

export const studioKanbanView = {
    ...kanbanView,
    Renderer: StudioKanbanRenderer,
    props(genericProps, view) {
        const models = genericProps.models || genericProps.relatedModels || {};
        const fields = genericProps.fields || {};
        
        if (genericProps.resModel) {
            if (!models[genericProps.resModel]) {
                models[genericProps.resModel] = { fields };
            } else if (models[genericProps.resModel] && !models[genericProps.resModel].fields) {
                models[genericProps.resModel].fields = fields;
            }
        }

        const propsWithModels = {
            ...genericProps,
            type: "kanban",
            fields,
            models,
            relatedModels: models,
        };
        const res = kanbanView.props ? kanbanView.props(propsWithModels, view) : propsWithModels;
        res.readonly = true;
        return res;
    }
};

registry.category("views").add("studio_kanban", studioKanbanView);
