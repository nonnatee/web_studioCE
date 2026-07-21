import { registry } from "@web/core/registry";
import { listView } from "@web/views/list/list_view";
import { StudioListController } from "./studio_list_controller";
import { StudioListRenderer } from "./studio_list_renderer";

export const studioListView = {
    ...listView,
    Controller: StudioListController,
    Renderer: StudioListRenderer,
    props(genericProps, view) {
        const res = listView.props(genericProps, view);
        res.readonly = true;
        return res;
    }
};

registry.category("views").add("studio_list", studioListView);
