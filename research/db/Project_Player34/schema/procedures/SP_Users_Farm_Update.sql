-- SQL_STORED_PROCEDURE dbo.SP_Users_Farm_Update (modified 2021-06-04T05:18:36.080)
-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<用户信息：更新人物物品信息>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_Users_Farm_Update] 
			@ID int   
		   ,@FarmID int
           ,@PayFieldMoney nvarchar(50)
           ,@PayAutoMoney nvarchar(50)
           ,@AutoPayTime datetime
           ,@AutoValidDate int
           ,@VipLimitLevel int
           ,@FarmerName nvarchar(50)
           ,@GainFieldId int
           ,@MatureId int
           ,@KillCropId int
           ,@isAutoId int
           ,@isFarmHelper bit
           ,@buyExpRemainNum int
           ,@isArrange bit
           ,@TreeLevel int
           ,@TreeExp int
           ,@LoveScore int
           ,@MonsterExp int
           ,@PoultryState int
           ,@CountDownTime datetime          
           ,@TreeCostExp int
           
 AS    
   begin 
UPDATE [dbo].[Sys_User_Farm]
   SET [FarmID] = @FarmID
      ,[PayFieldMoney] = @PayFieldMoney
      ,[PayAutoMoney] = @PayAutoMoney
      ,[AutoPayTime] = @AutoPayTime
      ,[AutoValidDate] = @AutoValidDate
      ,[VipLimitLevel] = @VipLimitLevel
      ,[FarmerName] = @FarmerName
      ,[GainFieldId] = @GainFieldId
      ,[MatureId] = @MatureId
      ,[KillCropId] = @KillCropId
      ,[isAutoId] = @isAutoId
      ,[isFarmHelper] = @isFarmHelper
      ,[buyExpRemainNum] = @buyExpRemainNum
      ,[isArrange] = @isArrange
      ,[TreeLevel] = @TreeLevel
      ,[TreeExp] = @TreeExp
      ,[LoveScore] = @LoveScore
      ,[MonsterExp] = @MonsterExp
      ,[PoultryState] = @PoultryState
      ,[CountDownTime] = @CountDownTime
      ,[TreeCostExp] = @TreeCostExp
     WHERE [FarmID] = @FarmID
   --return 0
           end
--if(@@error <> 0)
--begin
--  return 1 ---Return false insert error
--end


GO
