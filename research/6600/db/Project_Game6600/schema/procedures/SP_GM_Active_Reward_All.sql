-- SQL_STORED_PROCEDURE dbo.SP_GM_Active_Reward_All (modified 2015-01-25T14:04:48.613)
CREATE  PROCEDURE [dbo].[SP_GM_Active_Reward_All]
    AS
         BEGIN
            SELECT * FROM GM_Active_Reward
         END

GO
