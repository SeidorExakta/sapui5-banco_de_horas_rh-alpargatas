sap.ui.define([
    "./BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/Sorter",
    "sap/ui/model/FilterOperator",
    "sap/m/GroupHeaderListItem",
    "sap/ui/Device",
    "sap/ui/core/Fragment",
], function (BaseController, JSONModel, Filter, Sorter, FilterOperator, GroupHeaderListItem, Device, Fragment) {
    "use strict";

    return BaseController.extend("hr.bancodehorasrh.controller.MasterUnidOrg", {

        onInit: function () {

            //Só para ALPA -> Não exibir a tela de Unidades Organizacionais
            this.getOwnerComponent().getRouter().navTo("MasterEmployee", {
                orgeh: ''
            }, true);

            var oList = this.byId("list"),
                oViewModel = this._createViewModel(),
                iOriginalBusyDelay = oList.getBusyIndicatorDelay();

            this._oGroupFunctions = {
                CategoryID: function (oContext) {
                    var iNumber = oContext.getProperty('CategoryID'),
                        key, text;
                    if (iNumber <= 20) {
                        key = "LE20";
                        text = this.getResourceBundle().getText("masterGroup1Header1");
                    } else {
                        key = "GT20";
                        text = this.getResourceBundle().getText("masterGroup1Header2");
                    }
                    return {
                        key: key,
                        text: text
                    };
                }.bind(this)
            };

            this._oList = oList;
            this._oListFilterState = {
                aFilter: [],
                aSearch: []
            };

            this.setModel(oViewModel, "masterView");
            oList.attachEventOnce("updateFinished", function () {
                oViewModel.setProperty("/delay", iOriginalBusyDelay);
            });

            this.getRouter().attachBypassed(this.onBypassed, this);
        },

        onUpdateFinished: function (oEvent) {
            // update the master list object counter after new data is loaded
            this._updateListItemCount(oEvent.getParameter("total"));
        },

        onSearch: function (oEvent) {
            if (oEvent.getParameters().refreshButtonPressed) {
                this.onRefresh();
                return;
            }
            var sQuery = oEvent.getParameter("query");
            if (sQuery) {
                this._oListFilterState.aSearch = [new Filter("orgehTxt", FilterOperator.Contains, sQuery)];
            } else {
                this._oListFilterState.aSearch = [];
            }
            this._applyFilterSearch();
        },

        onRefresh: function () {
            this._oList.getBinding("items").refresh();
        },

        onOpenViewSettings: function (oEvent) {
            var sDialogTab = "filter";
            if (oEvent.getSource() instanceof sap.m.Button) {
                var sButtonId = oEvent.getSource().getId();
                if (sButtonId.match("sort")) {
                    sDialogTab = "sort";
                } else if (sButtonId.match("group")) {
                    sDialogTab = "group";
                }
            }
            // load asynchronous XML fragment
            if (!this.byId("viewSettingsDialog")) {
                Fragment.load({
                    id: this.getView().getId(),
                    name: "hr.bancodehorasrh.view.ViewSettingsDialog",
                    controller: this
                }).then(function (oDialog) {
                    this.getView().addDependent(oDialog);
                    oDialog.addStyleClass(this.getOwnerComponent().getContentDensityClass());
                    oDialog.open(sDialogTab);
                }.bind(this));
            } else {
                this.byId("viewSettingsDialog").open(sDialogTab);
            }
        },

        onConfirmViewSettingsDialog: function (oEvent) {
            var aFilterItems = oEvent.getParameters().filterItems,
                aFilters = [],
                aCaptions = [];

            aFilterItems.forEach(function (oItem) {
                switch (oItem.getKey()) {
                    case "Filter1":
                        aFilters.push(new Filter("CategoryID", FilterOperator.LE, 100));
                        break;
                    case "Filter2":
                        aFilters.push(new Filter("CategoryID", FilterOperator.GT, 100));
                        break;
                    default:
                        break;
                }
                aCaptions.push(oItem.getText());
            });

            this._oListFilterState.aFilter = aFilters;
            this._updateFilterBar(aCaptions.join(", "));
            this._applyFilterSearch();
            this._applySortGroup(oEvent);
        },

        _applySortGroup: function (oEvent) {
            var mParams = oEvent.getParameters(),
                sPath,
                bDescending,
                aSorters = [];
            if (mParams.groupItem) {
                sPath = mParams.groupItem.getKey();
                bDescending = mParams.groupDescending;
                var vGroup = this._oGroupFunctions[sPath];
                aSorters.push(new Sorter(sPath, bDescending, vGroup));
            }
            sPath = mParams.sortItem.getKey();
            bDescending = mParams.sortDescending;
            aSorters.push(new Sorter(sPath, bDescending));
            this._oList.getBinding("items").sort(aSorters);
        },

        onSelectionChange: function (oEvent) {
            var oList = oEvent.getSource(),
                bSelected = oEvent.getParameter("selected");
            if (!(oList.getMode() === "MultiSelect" && !bSelected)) {
                this._showDetail(oEvent.getParameter("listItem") || oEvent.getSource());
            }
        },

        onBypassed: function () {
            this._oList.removeSelections(true);
        },

        createGroupHeader: function (oGroup) {
            return new GroupHeaderListItem({
                title: oGroup.text,
                upperCase: false
            });
        },

        onNavBack: function () {
            // eslint-disable-next-line sap-no-history-manipulation
            history.go(-1);
        },

        _createViewModel: function () {
            return new JSONModel({
                isFilterBarVisible: false,
                filterBarLabel: "",
                delay: 0,
                title: this.getResourceBundle().getText("masterTitleCount", [0]),
                noDataText: this.getResourceBundle().getText("masterListNoDataText"),
                sortBy: "CategoryName",
                groupBy: "None"
            });
        },

        _onMasterMatched: function () {
            this.getModel("appView").setProperty("/layout", "OneColumn");
        },

        onUniOrgListItemPress: function (oEvent) {
            this._showEmployee(oEvent.getParameter("listItem") || oEvent.getSource());
        },

        _showEmployee: function (oItem) {
            var bReplace = !Device.system.phone;
            this.getOwnerComponent().getRouter().navTo("MasterEmployee", {
                orgeh: oItem.getBindingContext().getProperty("orgeh")
            }, bReplace);
        },

        _updateListItemCount: function (iTotalItems) {
            var sTitle;
            if (this._oList.getBinding("items").isLengthFinal()) {
                sTitle = this.getResourceBundle().getText("masterTitleCount", [iTotalItems]);
                this.getModel("masterView").setProperty("/title", sTitle);
            }
        },

        _applyFilterSearch: function () {
            var aFilters = this._oListFilterState.aSearch.concat(this._oListFilterState.aFilter),
                oViewModel = this.getModel("masterView");
            this._oList.getBinding("items").filter(aFilters, "Application");
            if (aFilters.length !== 0) {
                oViewModel.setProperty("/noDataText", this.getResourceBundle().getText("masterListNoDataWithFilterOrSearchText"));
            } else if (this._oListFilterState.aSearch.length > 0) {
                oViewModel.setProperty("/noDataText", this.getResourceBundle().getText("masterListNoDataText"));
            }
        },

        _updateFilterBar: function (sFilterBarText) {
            var oViewModel = this.getModel("masterView");
            oViewModel.setProperty("/isFilterBarVisible", (this._oListFilterState.aFilter.length > 0));
            oViewModel.setProperty("/filterBarLabel", this.getResourceBundle().getText("masterFilterBarText", [sFilterBarText]));
        }

    });

});