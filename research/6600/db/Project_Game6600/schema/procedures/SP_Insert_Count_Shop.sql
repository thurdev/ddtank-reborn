-- SQL_STORED_PROCEDURE dbo.SP_Insert_Count_Shop (modified 2015-01-25T14:04:48.133)
-- =============================================
-- Author:		Justin
-- Create date: 2008.11.26
-- Description:	插入用户购买物品信息
-- =============================================
CREATE PROCEDURE [dbo].[SP_Insert_Count_Shop]
	@ApplicatonId			int,
	@SubId					int,
	@UserId					int,
	@Money					int,
	@Gold					int,
	@DateTime				datetime,
	@Goods					nvarchar(200),
	@GoodsType					nvarchar(200)
AS
BEGIN
	insert into Db_Count..Count_Shop(ApplicationId,SubId,UserId,[Money],[Gold],EnterTime,GoodId,GoodsType)
	values(@ApplicatonId,@SubId,@UserId,@Money,@Gold,@DateTime,@Goods,@GoodsType)
END

GO
