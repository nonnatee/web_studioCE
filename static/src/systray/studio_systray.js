import { registry } from "@web/core/registry";
import { Component } from "@odoo/owl";
import { useService } from "@web/core/utils/hooks";

export class StudioSystray extends Component {
    static template = "web_studioCE.StudioSystray";
    setup() {
        this.studio = useService("studio");
    }
    onClick() {
        this.studio.enterStudioMode();
    }
}

registry.category("systray").add("web_studioCE.StudioSystray", { Component: StudioSystray }, { sequence: 5 });
