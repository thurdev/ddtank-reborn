-- SQL_STORED_PROCEDURE dbo.SP_Card_Buff_All (modified 2021-06-04T01:29:17.783)
CREATE  PROCEDURE [dbo].[SP_Card_Buff_All]
    AS
         BEGIN
            SELECT * FROM Card_Buff
         END

GO
