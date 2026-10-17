-- SQL_STORED_PROCEDURE dbo.SP_Halloween_Rank_All (modified 2015-02-20T11:19:56.613)

CREATE  PROCEDURE [dbo].[SP_Halloween_Rank_All]
    AS
         BEGIN
            SELECT TOP 100 * FROM Halloween_Rank WHERE useNum > 0
         END

GO
