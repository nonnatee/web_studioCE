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
        const propsWithModels = {
            ...genericProps,
            models: genericProps.models || genericProps.relatedModels || {},
            relatedModels: genericProps.relatedModels || genericProps.models || {},
        };
        const res = formView.props(propsWithModels, view);
        // Force preview view to be readonly
        res.readonly = true;
        return res;
    }
};

registry.category("views").add("studio_form", studioFormView);
