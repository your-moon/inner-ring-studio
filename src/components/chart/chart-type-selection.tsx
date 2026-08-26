import { produce } from "immer";
import { ChartBar, ChartColumn, ChartLine, ChartPie, ChartScatter, CircleDot, Filter, Table, Type } from "lucide-react";
import { Dispatch, SetStateAction } from "react";
import { ChartValue } from "./chart-type";
import { ChartTypeButton } from "./chart-type-button";

interface ChartTypeSelectionProps {
  value: ChartValue;
  onChange: Dispatch<SetStateAction<ChartValue>>;
}

export default function ChartTypeSelection({
  value,
  onChange,
}: ChartTypeSelectionProps) {
  return (
    <section key={1}>
      <p className="mb-1.5 text-sm font-bold opacity-70">Chart Type</p>
      <div className="flex flex-wrap gap-4">
        <ChartTypeButton
          icon={<ChartLine />}
          isActive={value.type === "line"}
          onClick={() => {
            onChange((prev) => {
              return produce(prev, (draft) => {
                draft.type = "line";
              });
            });
          }}
          tooltipText="Line"
          suggested={value.suggestedChartType?.includes("line") || false}
        />
        <ChartTypeButton
          icon={<ChartColumn />}
          isActive={value.type === "column"}
          onClick={() => {
            onChange((prev) => {
              return produce(prev, (draft) => {
                draft.type = "column";
              });
            });
          }}
          tooltipText="Column"
          suggested={value.suggestedChartType?.includes("column") || false}
        />
        <ChartTypeButton
          icon={<ChartColumn />}
          isActive={value.type === "bar"}
          onClick={() => {
            onChange((prev) => {
              return produce(prev, (draft) => {
                draft.type = "bar";
              });
            });
          }}
          tooltipText="Bar"
          suggested={value.suggestedChartType?.includes("bar") || false}
        />
        <ChartTypeButton
          icon={<ChartScatter />}
          isActive={value.type === "scatter"}
          onClick={() => {
            onChange((prev) => {
              return produce(prev, (draft) => {
                draft.type = "scatter";
              });
            });
          }}
          tooltipText="scatter"
          suggested={value.suggestedChartType?.includes("scatter") || false}
        />
        <ChartTypeButton
          icon={<Type />}
          isActive={value.type === "text"}
          onClick={() => {
            onChange((prev) => {
              return produce(prev, (draft) => {
                draft.type = "text";
              });
            });
          }}
          tooltipText="Text"
          suggested={value.suggestedChartType?.includes("text") || false}
        />
        <ChartTypeButton
          icon={<CircleDot />}
          isActive={value.type === "single_value"}
          onClick={() => {
            onChange((prev) => {
              return produce(prev, (draft) => {
                draft.type = "single_value";
              });
            });
          }}
          tooltipText="Single Value"
          suggested={
            value.suggestedChartType?.includes("single_value") || false
          }
        />
        <ChartTypeButton
          icon={<Table />}
          isActive={value.type === "table"}
          onClick={() => {
            onChange((prev) => {
              return produce(prev, (draft) => {
                draft.type = "table";
              });
            });
          }}
          tooltipText="Table"
          suggested={value.suggestedChartType?.includes("table") || false}
        />
        <ChartTypeButton
          icon={<ChartPie />}
          isActive={value.type === "pie"}
          onClick={() => {
            onChange((prev) => {
              return produce(prev, (draft) => {
                draft.type = "pie";
              });
            });
          }}
          tooltipText="Pie"
          suggested={value.suggestedChartType?.includes("pie") || false}
        />
        <ChartTypeButton
          icon={<ChartPie />}
          isActive={value.type === "radar"}
          onClick={() => {
            onChange((prev) => {
              return produce(prev, (draft) => {
                draft.type = "radar";
              });
            });
          }}
          tooltipText="Radar"
          suggested={value.suggestedChartType?.includes("radar") || false}
        />
        <ChartTypeButton
          icon={<Filter />}
          isActive={value.type === "funnel"}
          onClick={() => {
            onChange((prev) => {
              return produce(prev, (draft) => {
                draft.type = "funnel";
              });
            });
          }}
          tooltipText="Filter"
          suggested={value.suggestedChartType?.includes("funnel") || false}
        />
      </div>
    </section>
  );
}
