import { registry } from "@web/core/registry";
import { formView } from "@web/views/form/form_view";
import { StudioFormController } from "./studio_form_controller";
import { StudioFormRenderer } from "./studio_form_renderer";
import { StudioFormCompiler } from "./studio_form_compiler";

export const studioFormView = {
    ...formView,
    Controller: StudioFormController,
    Renderer: StudioFormRenderer,
    Compiler: StudioFormCompiler,
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
            type: "form",
            fields,
            models,
            relatedModels: models,
        };
        const res = formView.props(propsWithModels, view);
        // Force preview view to be readonly
        res.readonly = true;
        return res;
    }
};

registry.category("views").add("studio_form", studioFormView);

