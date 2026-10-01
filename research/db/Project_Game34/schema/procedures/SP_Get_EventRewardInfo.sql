-- SQL_STORED_PROCEDURE dbo.SP_Get_EventRewardInfo (modified 2021-06-04T01:29:18.027)
-- =============================================
-- Author:		<bTh>
-- Create date: <07/09/2017 20:30:08>
-- Description:	<Pega as informações do NoviceActivity>
-- =============================================
CREATE PROCEDURE [dbo].[SP_Get_EventRewardInfo]
AS
BEGIN
SELECT * FROM Event_Reward_Info ORDER BY ActivityType ASC, SubActivityType
END

GO
