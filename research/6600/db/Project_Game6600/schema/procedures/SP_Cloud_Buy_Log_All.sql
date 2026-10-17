-- SQL_STORED_PROCEDURE dbo.SP_Cloud_Buy_Log_All (modified 2015-03-05T15:21:10.650)

CREATE  PROCEDURE [dbo].[SP_Cloud_Buy_Log_All]
    AS
         BEGIN
            SELECT * FROM Cloud_Buy_Log
         END

GO
