sap.ui.define([], function () {
    "use strict";

    return {
        /**
         * Formatação Mês e Ano em texto
         *
         * @public
         * @param {sMes} Mês
         * @param {sAno} Ano
         * @returns {string} Data Formatada
         */
        PeriodText: function (sMes, sAno) {
            var oBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
            var oDateFormat = sap.ui.core.format.DateFormat.getDateInstance({
                UTC: true,
                pattern: "MMMM"
            });
            if (sMes && sAno) {
                var oDate = new Date(sAno + "-" + sMes + "-01");
                var sMonth = oDateFormat.format(oDate);
                var sFormat = sMonth + " " + oBundle.getText("sep") + " " + sAno;
                return sFormat[0].toUpperCase() + sFormat.substring(1);
            }

        },

        /**
         * Retorna mensagem de erro
         *
         * @public
         * @param {oError} odata erro
         * @returns {string} mensagem
         */
        getError: function (oError) {
            var sMessage = "";
            var sCode;
            if (oError.responseRaw) {
                return $(oError.responseRaw).find("message").first().text();
            }
            if (oError.responseText) {
                try {
                    //Retorno em Json
                    return JSON.parse(oError.responseText).error.message.value;
                } catch (exception) {
                    //Retorno em xml
                    return $(oError.responseText).find("message").first().text();
                }
            }
            jQuery.each(oError.__batchResponses, function (index) {
                if (oError.__batchResponses[index].response) {
                    sCode = oError.__batchResponses[index].response.statusCode;
                } else {
                    sCode = oError.__batchResponses[index].statusCode;
                }
                if (sCode === "400") {
                    sMessage = JSON.parse(oError.__batchResponses[index].response.body).error.message.value;
                }
            });
            return sMessage;
        }
    };
});