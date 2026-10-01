-- SQL_STORED_PROCEDURE dbo.SP_Get_EventRewardGoods_Type (modified 2021-06-04T01:29:18.023)
-- =============================================
-- Author:		<bTh>
-- Create date: <07/09/2017 21:24:00>
-- Description:	<Pega as informações do NoviceActivity>
-- =============================================
CREATE PROCEDURE [dbo].[SP_Get_EventRewardGoods_Type]
     @ActivityType int,
	 @SubActivityType int
AS
BEGIN
SELECT * FROM dbo.Event_Reward_Goods WHERE ActivityType = @ActivityType AND SubActivityType = @SubActivityType
END

GO
