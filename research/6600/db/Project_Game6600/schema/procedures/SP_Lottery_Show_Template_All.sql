-- SQL_STORED_PROCEDURE dbo.SP_Lottery_Show_Template_All (modified 2015-01-25T14:04:48.577)
CREATE  PROCEDURE [dbo].[SP_Lottery_Show_Template_All]
    AS
         BEGIN
            SELECT * FROM Lottery_Show_Template
         END

GO
