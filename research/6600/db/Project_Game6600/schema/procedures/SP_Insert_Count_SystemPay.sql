-- SQL_STORED_PROCEDURE dbo.SP_Insert_Count_SystemPay (modified 2015-01-25T14:04:48.133)
-- =============================================
-- Author:		Eric
-- Create date: 2009.09.15
-- Description:	插入非商品花费点劵信息
-- =============================================
CREATE PROCEDURE [dbo].[SP_Insert_Count_SystemPay]
	@ApplicatonId			int,
	@SubId					int,
	@ConsumerId					int,
	@Money					int,
	@Gold					int,
	@ConsumerType					int,
	@SubConsumerType					int,
	@DateTime				datetime
AS
BEGIN
	insert into Db_Count..Count_SystemPay(ApplicationId,SubId,PayUserId,Point,[Gold],MastType,SonType,PayTime)
	values(@ApplicatonId,@SubId,@ConsumerId,@Money,@Gold,@ConsumerType,@SubConsumerType,@DateTime)
END

GO
