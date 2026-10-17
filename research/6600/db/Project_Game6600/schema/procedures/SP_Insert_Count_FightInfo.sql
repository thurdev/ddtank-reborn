-- SQL_STORED_PROCEDURE dbo.SP_Insert_Count_FightInfo (modified 2015-01-25T14:04:48.137)
-- =============================================
-- Author:		<Justin>
-- ALTER  date: <2008-11-28>
-- Description:	<战斗记录:结束战斗后，插入一条战斗信息>
-- =============================================
CREATE PROCEDURE [dbo].[SP_Insert_Count_FightInfo]
		@ApplicationId			int,
		@SubId					int,
		@ServerId				int,
		@BeginTime				datetime,
		@EndTime				datetime,
		@UserCount				int,
		@MapId					int,
		@Money					int,
		@Gold					int,
		@Users					varchar(50)
AS
BEGIN
	insert into Db_Count..Count_FightInfo(ApplicationId,SubId,LineId,PlayBegin,PlayEnd,UserCount,MapId,PlayPoint,PlayGold,Users)
	values(@ApplicationId,@SubId,@ServerId,@BeginTime,@EndTime,@UserCount,@MapId,@Money,@Gold,@Users)
END

GO
