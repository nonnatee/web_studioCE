import { KanbanRenderer } from "@web/views/kanban/kanban_renderer";
import { useService } from "@web/core/utils/hooks";

export class StudioKanbanRenderer extends KanbanRenderer {
    static props = {
        ...KanbanRenderer.props,
        "*": true,
    };

    setup() {
        super.setup();
        this.studio = useService("studio");
        this.orm = useService("orm");
    }

    onCardSelect(ev, record) {
        this.studio.setSelectedElement({
            type: "kanban_card",
            xpath: "//kanban",
            name: "kanban_card",
            string: "Kanban Card Layout",
            invisible: false,
            readonly: true,
            required: false,
        });
    }
}
