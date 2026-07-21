import { patch } from "@web/core/utils/patch";
import { WebClient } from "@web/webclient/webclient";
import { StudioEditor } from "./editor/studio_editor";
import { useService } from "@web/core/utils/hooks";

patch(WebClient.prototype, {
    setup() {
        super.setup();
        this.studio = useService("studio");
    }
});

// Register StudioEditor in standard components of WebClient
Object.assign(WebClient.components, { StudioEditor });
