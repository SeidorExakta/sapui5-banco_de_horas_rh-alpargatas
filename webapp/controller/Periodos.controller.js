sap.ui.define([
    "./BaseController",
    "sap/ui/model/json/JSONModel",
    "../model/formatter",
    "sap/ui/model/Filter",
    "sap/ui/model/Sorter",
    "sap/ui/model/FilterOperator",
    "sap/ui/Device",
    "sap/m/library",
    "sap/m/MessageBox"
], function (BaseController, JSONModel, formatter, Filter, Sorter, FilterOperator, Device, mobileLibrary, MessageBox) {
    "use strict";

    return BaseController.extend("hr.bancodehorasrh.controller.Periodos", {

        formatter: formatter,
        
        /* =========================================================== */
        /* lifecycle methods                                           */
        /* =========================================================== */

        onInit: function () {
            // Model used to manipulate control states. The chosen values make sure,
            // detail page is busy indication immediately so there is no break in
            // between the busy indication for loading the view's meta data
            var oViewModel = new JSONModel({
                busy: false,
                delay: 0
            });

            this._oBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();

            this.getRouter().getRoute("object").attachPatternMatched(this._onObjectMatched, this);
            this.getRouter().getRoute("Detail").attachPatternMatched(this._onObjectMatched, this);

            this.setModel(oViewModel, "detailViewPerio");

            this.getOwnerComponent().getModel().metadataLoaded().then(this._onMetadataLoaded.bind(this));
        },

        /* =========================================================== */
        /* event handlers                                              */
        /* =========================================================== */

        /**
         * Set the full screen mode to false and navigate to master page
         */
        onCloseDetailPress: function () {
            var bReplace = !Device.system.phone;
            this.getModel("appView").setProperty("/actionButtonsInfo/midColumn/fullScreen", false);
            this.getModel("appView").setProperty("/layout", "OneColumn");
            // No item should be selected on master after detail page is closed
            // this.getOwnerComponent().oListSelector.clearMasterListSelection();
            this.getRouter().navTo("MasterEmployee", bReplace);
        },

        /**
         * Event handler for the list selection event
         * @param {sap.ui.base.Event} oEvent the list selectionChange event
         * @public
         */
        onSelectionChange: function (oEvent) {
            var oList = oEvent.getSource(),
                bSelected = oEvent.getParameter("selected");

            // skip navigation when deselecting an item in multi selection mode
            if (!(oList.getMode() === "MultiSelect" && !bSelected)) {
                // get the list item, either from the listItem parameter or from the event's source itself (will depend on the device-dependent mode).
                this._showDetail(oEvent.getParameter("listItem") || oEvent.getSource());
            }
        },

        /**
         * Event handler for the master search field. Applies current
         * filter value and triggers a new search. If the search field's
         * 'refresh' button has been pressed, no new search is triggered
         * and the list binding is refresh instead.
         * @param {sap.ui.base.Event} oEvent the search event
         * @public
         */
        onSearch: function () {
            var oTableSearchState = [],
                sQuery = this.byId("idSearch").getValue();
            //Pesquisa Período
            if (sQuery && sQuery.length > 0) {

                var mes = sQuery.split("/")[0];
                var ano = sQuery.split("/")[1];
                var hasNonNumericMes = isNaN(Number(mes));
                var hasNonNumericAno = isNaN(Number(ano));
                if (hasNonNumericMes === false && hasNonNumericAno === false && mes.length === 2 && ano.length === 4) {

                    oTableSearchState = [new Filter("Mes", FilterOperator.Contains, mes),
                    new Filter("Ano", FilterOperator.Contains, ano)
                    ];
                } else {
                    MessageBox.error(this._oBundle.getText("errorPeriod"));
                }
            }

            //Pesquisa Pendentes
            /*if (this.byId("idPend").getSelected()) {
                oTableSearchState.push(new Filter("Pendente", FilterOperator.EQ, true));
            }*/

            this.byId("IdTable").getBinding("items").filter(oTableSearchState, "Application");
        },

        /**
         * Event handler for navigating back.
         * We navigate back in the browser historz
         * @public
         */
        onNavBack: function () {
            // eslint-disable-next-line sap-no-history-manipulation
            this.getRouter().navTo("masterEmployee", {}, true);
        },
        /* =========================================================== */
        /* begin: internal methods                                     */
        /* =========================================================== */

        /**
         * Binds the view to the object path and expands the aggregated line items.
         * @function
         * @param {sap.ui.base.Event} oEvent pattern match event in route 'object'
         * @private
         */
        _onObjectMatched: function (oEvent) {
            var sArguments = oEvent.getParameter("arguments");
            this.getModel("appView").setProperty("/layout", "TwoColumnsMidExpanded");
            this.setModel(new JSONModel(oEvent.getParameters("arguments").arguments), "argsDetailView");
            
            this.getModel().metadataLoaded().then(function () {
                var sObjectPath = this.getModel().createKey("employeesSet", {
                    pernr: sArguments.pernr
                });
                this._bindView("/" + sObjectPath);
            }.bind(this));
        },

        /**
         * Binds the view to the object path. Makes sure that detail view displays
         * a busy indicator while data for the corresponding element binding is loaded.
         * @function
         * @param {string} sObjectPath path to the object to be bound to the view.
         * @private
         */
        _bindView: function (sObjectPath) {
            // Set busy indicator during view binding
            var oViewModel = this.getModel("detailViewPerio");

            // If the view was not bound yet its not busy, only if the binding requests data it is set to busy again
            oViewModel.setProperty("/busy", false);
            
            this.getView().bindElement({
                path: sObjectPath,
                events: {
                    change: this._onBindingChange.bind(this),
                    dataRequested: function () {
                        oViewModel.setProperty("/busy", true);
                    },
                    dataReceived: function () {
                        oViewModel.setProperty("/busy", false);
                    }
                }
            });
        },

        _onBindingChange: function () {

            var oView = this.getView(),
                oElementBinding = oView.getElementBinding();

            // No data for the binding
            if (!oElementBinding.getBoundContext()) {
                this.getRouter().getTargets().display("masterEmployee");
                return;
            }

        },

        _onMetadataLoaded: function () {
            // Store original busy indicator delay for the detail view
            var iOriginalViewBusyDelay = this.getView().getBusyIndicatorDelay(),
                oViewModel = this.getModel("detailViewPerio");

            // Make sure busy indicator is displayed immediately when
            // detail view is displayed for the first time
            oViewModel.setProperty("/delay", 0);

            // Binding the view will set it to not busy - so the view is always busy if it is not bound
            oViewModel.setProperty("/busy", true);
            // Restore original busy indicator delay for the detail view
            oViewModel.setProperty("/delay", iOriginalViewBusyDelay);
        },

        /**
         * Shows the selected item on the detail page
         * On phones a additional history entry is created
         * @param {sap.m.ObjectListItem} oItem selected Item
         * @private
         */
        _showDetail: function (oItem) {
            var bReplace = !Device.system.phone;
            this.getModel("appView").setProperty("/layout", "ThreeColumnsEndExpanded");
            this.getRouter().navTo("Detail", {
                pernr: oItem.getBindingContext().getProperty("Pernr"),
                mes: oItem.getBindingContext().getProperty("Mes"),
                ano: oItem.getBindingContext().getProperty("Ano")
            }, bReplace);
        },

        /**
         * Toggle between full and non full screen mode.
         */
        toggleFullScreen: function () {
            var bFullScreen = this.getModel("appView").getProperty("/actionButtonsInfo/midColumn/fullScreen");
            this.getModel("appView").setProperty("/actionButtonsInfo/midColumn/fullScreen", !bFullScreen);
            if (!bFullScreen) {
                // store current layout and go full screen
                this.getModel("appView").setProperty("/previousLayout", this.getModel("appView").getProperty("/layout"));
                this.getModel("appView").setProperty("/layout", "MidColumnFullScreen");
            } else {
                // reset to previous layout
                this.getModel("appView").setProperty("/layout", this.getModel("appView").getProperty("/previousLayout"));
            }
        }
    });

});