/** @jest-environment jsdom */

import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTrigger,
} from "./alert-dialog";
import { Sheet, SheetContent, SheetTrigger } from "./sheet";

describe("Sheet", () => {
  it("opens from its trigger and shows title/description", () => {
    render(
      <Sheet>
        <SheetTrigger>Open</SheetTrigger>
        <SheetContent title="Row inspector" description="orders · 1">
          <span>body</span>
        </SheetContent>
      </Sheet>,
    );
    fireEvent.click(screen.getByText("Open"));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Row inspector")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
  });
});

describe("AlertDialog", () => {
  it("confirms through the action button", () => {
    const onConfirm = jest.fn();
    render(
      <AlertDialog>
        <AlertDialogTrigger>Drop</AlertDialogTrigger>
        <AlertDialogContent
          title="Drop table?"
          description="Permanent."
          confirmLabel="Drop table"
          cancelLabel="Keep it"
          onConfirm={onConfirm}
        />
      </AlertDialog>,
    );
    fireEvent.click(screen.getByText("Drop"));
    expect(screen.getByRole("alertdialog")).toHaveTextContent("Drop table?");
    fireEvent.click(screen.getByRole("button", { name: "Drop table" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
