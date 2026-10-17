-- SQL_STORED_PROCEDURE dbo.SP_Card_Buff_All (modified 2015-01-25T14:04:48.477)
CREATE  PROCEDURE [dbo].[SP_Card_Buff_All]
    AS
         BEGIN
            SELECT * FROM Card_Buff
         END

GO
