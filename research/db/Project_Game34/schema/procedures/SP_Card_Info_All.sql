-- SQL_STORED_PROCEDURE dbo.SP_Card_Info_All (modified 2021-06-04T01:29:17.790)
CREATE  PROCEDURE [dbo].[SP_Card_Info_All]
    AS
         BEGIN
            SELECT * FROM Card_Info
         END

GO
