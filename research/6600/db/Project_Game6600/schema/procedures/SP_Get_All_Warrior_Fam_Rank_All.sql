-- SQL_STORED_PROCEDURE dbo.SP_Get_All_Warrior_Fam_Rank_All (modified 2015-02-20T11:49:05.447)

CREATE  PROCEDURE [dbo].[SP_Get_All_Warrior_Fam_Rank_All]
    AS
         BEGIN
            SELECT TOP 100 * FROM V_Warrior_Fam_Rank WHERE myProgress > 0 ORDER  BY myProgress DESC
         END

GO
