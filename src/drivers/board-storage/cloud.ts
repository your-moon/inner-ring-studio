import { DashboardProps } from "@/components/board";
import { ChartValue } from "@/components/chart/chart-type";
import { generateId } from "@/lib/generate-id";
import { IBoardStorageDriver } from "./base";

/**
 * Cloud dashboard storage: persists the whole board (DashboardProps) to
 * /api/boards/[id]. Chart add/update/remove mutate the in-memory board and are
 * flushed by the subsequent save() the editor/canvas call (and by the page's
 * onChange persist). add() must mint a stable chart id.
 */
export default class CloudBoardStorage implements IBoardStorageDriver {
  constructor(private boardId: string) {}

  private async put(value: DashboardProps) {
    await fetch(`/api/boards/${this.boardId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: value, name: value.name }),
    });
  }

  async add(chart: ChartValue): Promise<ChartValue | undefined> {
    return { ...chart, id: generateId() };
  }

  async update(_chartId: string, chart: ChartValue): Promise<ChartValue | undefined> {
    return chart;
  }

  async remove(): Promise<void> {
    // The caller filters the chart out and calls save()/onChange, which persists.
  }

  async save(value: DashboardProps): Promise<void> {
    await this.put(value);
  }
}
