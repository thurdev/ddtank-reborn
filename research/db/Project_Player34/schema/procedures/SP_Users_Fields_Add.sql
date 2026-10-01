-- SQL_STORED_PROCEDURE dbo.SP_Users_Fields_Add (modified 2021-06-04T05:18:36.087)
CREATE PROCEDURE [dbo].[SP_Users_Fields_Add]
			@FarmID int
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
           ,@ID int output 
AS
BEGIN
declare @count2 int

select @count2 = isnull(count(*),0) from [dbo].[Sys_User_Field] where [ID] =@ID
if (@count2 = 0)
begin
    -- Insert statements for procedure here
    INSERT INTO [dbo].[Sys_User_Field]
           ([FarmID]
           ,[FieldID]
           ,[SeedID]
           ,[PlantTime]
           ,[AccelerateTime]
           ,[FieldValidDate]
           ,[PayTime]
           ,[GainCount]
           ,[AutoSeedID]
           ,[AutoFertilizerID]
           ,[AutoSeedIDCount]
           ,[AutoFertilizerCount]
           ,[isAutomatic]
           ,[AutomaticTime]
           ,[IsExit]
           ,[payFieldTime])
     VALUES
           (@FarmID
           ,@FieldID
           ,@SeedID
           ,@PlantTime
           ,@AccelerateTime
           ,@FieldValidDate
           ,@PayTime
           ,@GainCount
           ,@AutoSeedID
           ,@AutoFertilizerID
           ,@AutoSeedIDCount
           ,@AutoFertilizerCount
           ,@isAutomatic
           ,@AutomaticTime
           ,@IsExit
           ,@payFieldTime)
    select @@identity as 'identity'
    set @ID=@@identity    
	if(@@error <> 0)
	begin
	  return 1
	end
end
else 
begin
return 0
end

END


GO
