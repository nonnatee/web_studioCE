import { patch } from "@web/core/utils/patch";
import { WebClient } from "@web/webclient/webclient";
import { StudioEditor } from "./editor/studio_editor";
import { useService } from "@web/core/utils/hooks";
import { useState } from "@odoo/owl";

patch(WebClient.prototype, {
    setup() {
        super.setup();
        this.studio = useState(useService("studio"));
    }
});

// Register StudioEditor in standard components of WebClient
Object.assign(WebClient.components, { StudioEditor });
