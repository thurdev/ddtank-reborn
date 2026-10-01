-- SQL_STORED_PROCEDURE dbo.SP_UpdateVIPInfo (modified 2021-06-04T05:18:35.927)




-- =============================================
-- Author:		<Author,,Name>
-- Create date: <Create Date,,>
-- Description:	<Description,,>
-- =============================================
CREATE PROCEDURE [dbo].[SP_UpdateVIPInfo]
--@NickName Nvarchar(200),
@ID int,
@typeVIP int,
@VIPLevel int,
@VIPExp int,
@VIPOnlineDays int,
@VIPOfflineDays int,
@VIPExpireDay datetime,
@VIPLastDate datetime,
@VIPNextLevelDaysNeeded int,
@CanTakeVipReward bit

AS
update [Sys_VIP_Info] set 
	   [typeVIP] = @typeVIP
      ,[VIPLevel] = @VIPLevel
      ,[VIPExp] = @VIPExp
      ,[VIPOnlineDays] = @VIPOnlineDays
      ,[VIPOfflineDays] = @VIPOfflineDays
      ,[VIPExpireDay] = @VIPExpireDay
      ,[VIPLastDate] = @VIPLastDate
      ,[VIPNextLevelDaysNeeded] = @VIPNextLevelDaysNeeded
      ,[CanTakeVipReward] = @CanTakeVipReward
      where [UserID] = @ID








GO
