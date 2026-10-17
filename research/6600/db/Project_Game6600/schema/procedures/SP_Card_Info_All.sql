-- SQL_STORED_PROCEDURE dbo.SP_Card_Info_All (modified 2015-01-25T14:04:48.477)
CREATE  PROCEDURE [dbo].[SP_Card_Info_All]
    AS
         BEGIN
            SELECT * FROM Card_Info
         END

GO
