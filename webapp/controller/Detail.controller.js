sap.ui.define([
    "./BaseController",
    "sap/m/MessageToast",
    "sap/ui/core/format/DateFormat",
    "sap/m/PDFViewer",
    "sap/m/Dialog",
    "sap/m/Button",
    "sap/m/ButtonType",
    "sap/ui/model/json/JSONModel",
    "sap/ui/Device",
    "../model/formatter",
], function (BaseController, MessageToast, DateFormat, PDFViewer, Dialog, Button, ButtonType, JSONModel, Device, formatter) {
    "use strict";

    // var sServiceUrl = ("/sap/opu/odata/sap/ZHRTIME_RH_BH_SRV/");
    // var oOData = new sap.ui.model.odata.ODataModel(sServiceUrl, true);
    var oOData;
    var gPernr = "";
    var gPeriod = "";

    function addDate(dt, amount, dateType) {
        switch (dateType) {
            case 'days':
                return dt.setDate(dt.getDate() + amount) && dt;
            case 'weeks':
                return dt.setDate(dt.getDate() + (7 * amount)) && dt;
            case 'months':
                return dt.setMonth(dt.getMonth() + amount) && dt;
            case 'years':
                return dt.setFullYear(dt.getFullYear() + amount) && dt;
        }
    }

    return BaseController.extend("hr.bancodehorasrh.controller.Detail", {

        formatter: formatter,

        onInit: function () {
            // Step adicional em todas as apps pra funcionar essa gambiarra de acesso ao oModel no Workzone
            oOData = this.getOwnerComponent().getModel();

            var oViewModel = new JSONModel({
                busy: false,
                delay: 0,
                urlPdf: null,
                urlPdfVisible: false,
                option: null
            });

            var oJson = new JSONModel({
                cname: "teste"
            });

            this.Busy = new sap.m.BusyDialog({ busyIndicatorDelay: 0 });
            this.Busy.open();

            this.getRouter().getRoute("Detail").attachPatternMatched(this._onRoute, this);

            this.setModel(oViewModel, "detailView");

            this.getOwnerComponent().getModel().metadataLoaded().then(this._onMetadataLoaded.bind(this));
            
            this.Busy.close();
        },

        _onRoute: function (oEvent) {

            gPernr = oEvent.getParameters().arguments.pernr;
            gPeriod = oEvent.getParameters().arguments.datum;

            //Parâmetros URL
            var sAno = oEvent.getParameter("arguments").ano;
            var sMes = oEvent.getParameter("arguments").mes;
            var sPernr = oEvent.getParameter("arguments").pernr;

            this.getModel("appView").setProperty("/layout", "ThreeColumnsEndExpanded");
            this.getModel().metadataLoaded().then(function () {
                var sObjectPath = this.getModel().createKey("ValidateSet", {
                    Pernr: sPernr,
                    Ano: sAno,
                    Mes: sMes
                });
                this._bindView("/" + sObjectPath);
            }.bind(this));
        },

        _bindView: function (sObjectPath) {
            // Set busy indicator during view binding
            var oViewModel = this.getModel("detailView");

            // If the view was not bound yet its not busy, only if the binding requests data it is set to busy again
            oViewModel.setProperty("/busy", false);

            this.getView().bindElement({
                path: sObjectPath,
                parameters: {
                    expand: "header,Assinatura"
                },
                events: {
                    change: this._onBindingChange.bind(this),
                    dataRequested: function () {
                        oViewModel.setProperty("/busy", true);
                    },
                    dataReceived: function () { }
                }
            });
        },

        _onMetadataLoaded: function () {
            // Store original busy indicator delay for the detail view
            var iOriginalViewBusyDelay = this.getView().getBusyIndicatorDelay(),
                oViewModel = this.getModel("detailView");

            // Make sure busy indicator is displayed immediately when
            // detail view is displayed for the first time
            oViewModel.setProperty("/delay", 0);

            // Binding the view will set it to not busy - so the view is always busy if it is not bound
            oViewModel.setProperty("/busy", true);
            // Restore original busy indicator delay for the detail view
            oViewModel.setProperty("/delay", iOriginalViewBusyDelay);
        },

        _onBindingChange: function () {

            var oView = this.getView(),
                oElementBinding = oView.getElementBinding();
            // Set busy indicator during view binding
            var oViewModel = this.getModel("detailView");

            // No data for the binding
            if (!oElementBinding.getBoundContext()) {
                this.getRouter().getTargets().display("detailObjectNotFound");
                oViewModel.setProperty("/busy", false);
                return;
            }

            oViewModel.setProperty("/busy", false);

            var sPerio = oElementBinding.getBoundContext().getProperty("Ano") + oElementBinding.getBoundContext().getProperty("Mes");

            this.utilLoadEntity(gPernr, sPerio);

        },

        utilLoadEntity: function (pPernr, pPeriodo) {
            var that = this;

            var oPDFViewer = this.getView().byId("idbancohoras");
            debugger;
            var sURL = "/BHPeriodPDF(Pernr='" + pPernr + "',Period='" + pPeriodo + "')/$value";
            sURL = sURL.replace(/:/g, '%3A');

            var oModel = this.getOwnerComponent().getModel();
            var oXhr = new window.XMLHttpRequest();
            var sUrlGet = oModel.sServiceUrl + "/" + sURL;
            oXhr.open("GET", sUrlGet);

            oXhr.responseType = "blob"; // force the HTTP response, response-type header to be blob
            oXhr.onload = function () {
                var oBlob = oXhr.response;
                var sNewURL = window.URL.createObjectURL(new Blob([oBlob], {
                    type: "application/pdf"
                }));
                //Publica URL
                jQuery.sap.addUrlWhitelist("blob");
                //Atualiza model com link
                that.getView().byId("idbancohoras").setSource(sNewURL);
                that.getView().byId("idbancohoras").setDisplayType("Auto");
                that.getView().byId("idbancohoras").setVisible(true);
            };
            oXhr.send();

            /*
            oOData.read(sURL, {
                success: function (oSuccess, oResponse) {
                    var vServiceUrl = sServiceUrl + sURL;
                    oPDFViewer.setSource(vServiceUrl);
                    oPDFViewer.setDisplayType("Auto");
                    oPDFViewer.setVisible(true);
                },
                error: function (Error) {
                    var message1 = "Erro ao retornar dados do banco de horas!";
                    var obj = "";
                    var message = "";
                    try {
                        if (Error.responseText) {
                            obj = JSON.parse(Error.responseText);
                            message = obj.error.message.value;
                        } else if (Error.response.body) {
                            var errorModel = new sap.ui.model.xml.XMLModel();
                            errorModel.setXML(Error.response.body);
                            if (errorModel.getProperty("/0/message") !== "") {
                                Error = errorModel.getProperty("/0/message");
                            } else {
                                message = message1;
                            }
                        } else {
                            message = message1;
                        }
                    } catch (error) {
                        message = message1;
                    }
                    MessageToast.show(message, {
                        duration: 5000,
                        animationDuration: 1000
                    });
                }
            });
            */
        },

        handleChange: function (evt) {

            let newSelectedDate = evt.getSource().getProperty("dateValue");
            var vPeriodo = `${newSelectedDate.getFullYear()}${("0" + (newSelectedDate.getMonth() + 1)).slice(-2)}`;

            console.log(vPeriodo);
            this.utilLoadEntity(gPernr, vPeriodo);

        },

        onPressBusca: function () {

            console.log(this.getView().byId("idRangeData").getFrom());

            var sBegda = this.formatToDate(this.getView().byId("idRangeData").getFrom());
            var sEndda = this.formatToDate(addDate(this.getView().byId("idRangeData").getTo(), -1, "days"));

            var sMesIni = sBegda.substr(5, 2);
            var sMesFim = sEndda.substr(5, 2);

            if (sBegda === null || sEndda === null) {
                this.openDialogToError("Data não Permitida");
            } else {
                if (sMesIni === sMesFim) {
                    this.utilLoadEntity(gPernr, sBegda, sEndda);
                }
                else {
                    this.openDialogToError("Selecionar apenas um mês no período de-até");
                }
            }
        },

        formatToDate: function (date) {
            var newDate = DateFormat.getDateTimeInstance({
                pattern: "yyyy-MM-ddT00:00:00",
                UTC: true
            }).format(date);
            return newDate;
        },

        onCloseMasterPress: function (evt) {
            var that = this;
            function sizeChanged(mParams) {
                switch (mParams.name) {
                    case "Phone":
                        that.getModel("appView").setProperty("/actionButtonsInfo/midColumn/fullScreen", false);
                        that.getModel("appView").setProperty("/layout", "OneColumn");
                        break;
                    case "Tablet":
                        that.getModel("appView").setProperty("/actionButtonsInfo/midColumn/fullScreen", false);
                        that.getModel("appView").setProperty("/layout", "OneColumn");
                        break;
                    case "Desktop":
                        var vFullSreen = that.getModel("appView").getData().layout;
                        if (vFullSreen === "ThreeColumnsEndExpanded") {
                            //that._setLayout("EndColumnFullScreen");
                            that.getModel("appView").setProperty("/previousLayout", that.getModel("appView").getProperty("/layout"));
                            that.getModel("appView").setProperty("/layout", "EndColumnFullScreen");
                        } else {
                            //that._setLayout("Full");
                            that.getModel("appView").setProperty("/layout", that.getModel("appView").getProperty("/previousLayout"));
                        }
                }
            }

            // Register an event handler to changes of the screen size
            // sap.ui.Device.media.attachHandler(sizeChanged, null, sap.ui.Device.media.RANGESETS.SAP_STANDARD);
            // Do some initialization work based on the current size
            sizeChanged(sap.ui.Device.media.getCurrentRange(sap.ui.Device.media.RANGESETS.SAP_STANDARD));
        },

        openDialogToError: function (text) {
            new Dialog({
                id: "IdDialogToError",
                title: "Mensagem de erro",
                type: "Message",
                state: "Error",
                content: new sap.m.Text({
                    text: text
                }),
                endButton: new Button({
                    text: "Cancelar",
                    press: function (oEvent) {
                        oEvent.getSource().getParent().close();
                    }
                }),
                afterClose: function (oEvent) {
                    oEvent.getSource().destroy();
                }
            }).open();
        },

        setInitDate: function () {

            var maxDate = new Date();
            maxDate = addDate(maxDate, -1, "days");

            var minDate = new Date("01-01-1800".replace(/(\d{2})-(\d{2})-(\d{4})/, "$2/$1/$3"));
            var firstDay = new Date(minDate);

            var y2 = maxDate.getFullYear();
            var m2 = maxDate.getMonth();
            var dateFrom = new Date(y2, m2, 1);

            var oModel = new JSONModel();
            oModel.setData({
                dateValueDRS2: dateFrom,
                secondDateValueDRS2: maxDate,
                dateMinDRS2: firstDay,
                dateMaxDRS2: maxDate
            });
            this.getView().setModel(oModel);

        },
        /**
        * Set the full screen mode to false and navigate to master page
        */
        onCloseDetailPress: function () {
            var bReplace = !Device.system.phone;
            this.getModel("appView").setProperty("/actionButtonsInfo/endColumn/fullScreen", false);
            this.getRouter().navTo("object", {
                pernr: gPernr
            }, bReplace);

        },

        /**
         * Toggle between full and non full screen mode.
         */
        toggleFullScreen: function () {
            var bFullScreen = this.getModel("appView").getProperty("/actionButtonsInfo/endColumn/fullScreen");
            this.getModel("appView").setProperty("/actionButtonsInfo/endColumn/fullScreen", !bFullScreen);
            if (!bFullScreen) {
                // store current layout and go full screen
                this.getModel("appView").setProperty("/previousLayout", this.getModel("appView").getProperty("/layout"));
                this.getModel("appView").setProperty("/layout", "EndColumnFullScreen");
            } else {
                // reset to previous layout
                this.getModel("appView").setProperty("/layout", this.getModel("appView").getProperty("/previousLayout"));
            }
        }

    });

});