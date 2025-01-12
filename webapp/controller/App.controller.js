sap.ui.define([
  "./BaseController",
  "sap/ui/model/json/JSONModel",
  "sap/ui/Device"
], function (BaseController, JSONModel, Device) {
  "use strict";

  return BaseController.extend("hr.bancodehorasgestor.controller.App", {

    onInit: function () {
      var oViewModel,
        fnSetAppNotBusy,
        iOriginalBusyDelay = this.getView().getBusyIndicatorDelay();

      oViewModel = new JSONModel({
        busy: true,
        delay: 0,
        layout: "OneColumn",
        previousLayout: "",
        actionButtonsInfo: {
          midColumn: {
            fullScreen: false
          }
        }
      });
      this.setModel(oViewModel, "appView");

      fnSetAppNotBusy = function () {
        oViewModel.setProperty("/busy", false);
        oViewModel.setProperty("/delay", iOriginalBusyDelay);
      };

      // since then() has no "reject"-path attach to the MetadataFailed-Event to disable the busy indicator in case of an error
      this.getOwnerComponent().getModel().metadataLoaded().then(fnSetAppNotBusy);
      this.getOwnerComponent().getModel().attachMetadataFailed(fnSetAppNotBusy);

      // apply content density mode to root view
      this.getView().addStyleClass(this.getOwnerComponent().getContentDensityClass());
      this.oRouter = this.getOwnerComponent().getRouter();
      this.oRouter.attachBeforeRouteMatched(this.onBeforeRouteMatched, this);

    },

    onBeforeRouteMatched: function (oEvent) {
      var oModel = this.getOwnerComponent().getModel();
      var sLayout = oEvent.getParameters().arguments.layout;
      // If there is no layout parameter, query for the default level 0 layout (normally OneColumn)
      if (!sLayout) {
        var oNextUIState = this.getOwnerComponent().getHelper().getNextUIState(0);
        sLayout = oNextUIState.layout;
      }
      // Update the layout of the FlexibleColumnLayout
      if (sLayout) {
        oModel.setProperty("/layout", sLayout);
      }
    }

  });
});