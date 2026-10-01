-- SQL_STORED_PROCEDURE dbo.SP_Users_Fields_Update (modified 2021-06-04T05:18:36.090)
-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<用户信息：更新人物物品信息>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_Users_Fields_Update]   
			@ID int
		   ,@FarmID int
           ,@FieldID int
           ,@SeedID int
           ,@PlantTime datetime
           ,@AccelerateTime int
           ,@FieldValidDate int
           ,@PayTime datetime
           ,@GainCount int
           ,@AutoSeedID int
           ,@AutoFertilizerID int
           ,@AutoSeedIDCount int
           ,@AutoFertilizerCount int
           ,@isAutomatic bit
           ,@AutomaticTime datetime
           ,@IsExit bit
           ,@payFieldTime int
           
 AS    
   begin 

UPDATE [dbo].[Sys_User_Field]
   SET [FarmID] = @FarmID
      ,[FieldID] = @FieldID
      ,[SeedID] = @SeedID
      ,[PlantTime] = @PlantTime
      ,[AccelerateTime] = @AccelerateTime
      ,[FieldValidDate] = @FieldValidDate
      ,[PayTime] = @PayTime
      ,[GainCount] = @GainCount
      ,[AutoSeedID] = @AutoSeedID
      ,[AutoFertilizerID] = @AutoFertilizerID
      ,[AutoSeedIDCount] = @AutoSeedIDCount
      ,[AutoFertilizerCount] = @AutoFertilizerCount
      ,[isAutomatic] = @isAutomatic
      ,[AutomaticTime] = @AutomaticTime
      ,[IsExit] = @IsExit
      ,[payFieldTime] = @payFieldTime
     WHERE [ID] = @ID--[FarmID] = @FarmID and [FieldID] = @FieldID
  --return 0
    end
--if(@@error <> 0)
--begin
--  return 1 ---Return false insert error
--end


GO
