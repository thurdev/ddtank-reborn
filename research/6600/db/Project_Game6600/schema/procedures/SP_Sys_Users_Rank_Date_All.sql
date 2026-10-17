-- SQL_STORED_PROCEDURE dbo.SP_Sys_Users_Rank_Date_All (modified 2015-01-25T14:04:48.177)
CREATE  PROCEDURE [dbo].[SP_Sys_Users_Rank_Date_All]
    AS
         BEGIN
            SELECT * FROM Sys_Users_Rank_Date
         END

GO
