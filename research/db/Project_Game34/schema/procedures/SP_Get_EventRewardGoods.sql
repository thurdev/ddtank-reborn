-- SQL_STORED_PROCEDURE dbo.SP_Get_EventRewardGoods (modified 2021-06-04T01:29:18.020)
-- =============================================
-- Author:		<bTh>
-- Create date: <07/09/2017 20:30:08>
-- Description:	<Pega as informações do NoviceActivity>
-- =============================================
CREATE PROCEDURE [dbo].[SP_Get_EventRewardGoods]
AS
BEGIN
SELECT * FROM Event_Reward_Goods ORDER BY ActivityType ASC, SubActivityType
END

GO
