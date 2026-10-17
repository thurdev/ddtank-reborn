-- SQL_STORED_PROCEDURE dbo.SP_Charge_Active_Template_All (modified 2015-01-25T14:04:48.473)
CREATE  PROCEDURE [dbo].[SP_Charge_Active_Template_All]
    AS
         BEGIN
            SELECT * FROM Charge_Active_Template
         END

GO
