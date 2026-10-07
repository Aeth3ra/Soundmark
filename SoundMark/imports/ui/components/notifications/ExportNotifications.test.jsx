import { Meteor } from "meteor/meteor";
import { render, fireEvent, act, cleanup } from "@testing-library/react";
import { assert } from "chai";
import sinon from "sinon";
import { NotificationProvider } from "./NotificationProvider";
import { AudioExportButton } from "../AudioExportButton";
import { RegionExportButton } from "../RegionExportButton";
import { ProjectPackageExportButton } from "../ProjectPackageExportButton";

if (Meteor.isClient) {
	describe("export notifications", function () {
		let calls, fetchStub, download;
		beforeEach(() => {
			calls = sinon
				.stub(Meteor, "callAsync")
				.resolves({ url: "/audio.wav", fileName: "song.wav" });
			fetchStub = sinon
				.stub(window, "fetch")
				.resolves({
					ok: true,
					blob: async () => new Blob(["audio"], { type: "audio/wav" })
				});
			download = sinon.stub(HTMLAnchorElement.prototype, "click");
		});
		afterEach(() => {
			cleanup();
			sinon.restore();
		});

		it("exports original audio using the existing download function and reports completion", async function () {
			const { getByText } = render(
				<NotificationProvider fileId="f">
					<AudioExportButton fileId="f" />
				</NotificationProvider>
			);
			await act(async () => {
				fireEvent.click(getByText("Original audio"));
			});
			assert.isTrue(calls.calledOnceWith("audio.getExportInfo", "f"));
			assert.isTrue(fetchStub.calledOnceWith("/audio.wav"));
			assert.isTrue(download.calledOnce);
			assert.exists(getByText("Export ready—download started."));
		});

		it("replaces browser alerts with a retryable failure", async function () {
			fetchStub.onFirstCall().rejects(new Error("Offline"));
			const alert = sinon.stub(window, "alert");
			const { getByText, getByRole } = render(
				<NotificationProvider fileId="f">
					<AudioExportButton fileId="f" />
				</NotificationProvider>
			);
			await act(async () => {
				fireEvent.click(getByText("Original audio"));
			});
			assert.include(
				getByRole("alert").textContent,
				"Could not export the audio."
			);
			assert.isFalse(alert.called);
			await act(async () => {
				fireEvent.click(getByText("Retry"));
			});
			assert.isTrue(download.calledOnce);
			assert.exists(getByText("Export ready—download started."));
		});

		it("keeps a region export disabled until a region and effects are ready", function () {
			const { getByText, rerender } = render(
				<NotificationProvider fileId="f">
					<RegionExportButton fileId="f" />
				</NotificationProvider>
			);
			assert.isTrue(getByText("Export selection").disabled);
			rerender(
				<NotificationProvider fileId="f">
					<RegionExportButton
						fileId="f"
						activeRegion={{ start: 0, end: 1 }}
						isEffectsLoading
					/>
				</NotificationProvider>
			);
			assert.isTrue(getByText("Export selection").disabled);
			fireEvent.click(getByText("Export selection"));
			assert.isFalse(calls.called);
		});

		it("reports project-package failures without changing its export metadata request", async function () {
			fetchStub.rejects(new Error("Offline"));
			const { getByText, getByRole } = render(
				<NotificationProvider fileId="f">
					<ProjectPackageExportButton
						fileId="f"
						annotations={[]}
						effects={[]}
					/>
				</NotificationProvider>
			);
			await act(async () => {
				fireEvent.click(getByText("Export project"));
			});
			assert.isTrue(calls.calledOnceWith("audio.getExportInfo", "f"));
			assert.include(
				getByRole("alert").textContent,
				"Could not export the project package."
			);
			assert.isFalse(getByText("Export project").disabled);
		});
	});
}
