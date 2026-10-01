-- SQL_STORED_PROCEDURE dbo.SP_Users_Farm_Add (modified 2021-06-04T05:18:36.073)
CREATE PROCEDURE [dbo].[SP_Users_Farm_Add]
			@FarmID int
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
           ,@ID int output 
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
BEGIN
declare @count int

select @count = isnull(count(*),0) from [dbo].[Sys_User_Farm] where [FarmID] =@FarmID
if (@count = 0)
begin
    -- Insert statements for procedure here
    INSERT INTO [dbo].[Sys_User_Farm]
           ([FarmID]
           ,[PayFieldMoney]
           ,[PayAutoMoney]
           ,[AutoPayTime]
           ,[AutoValidDate]
           ,[VipLimitLevel]
           ,[FarmerName]
           ,[GainFieldId]
           ,[MatureId]
           ,[KillCropId]
           ,[isAutoId]
           ,[isFarmHelper]
           ,[buyExpRemainNum]
           ,[isArrange]
           ,[TreeLevel]
           ,[TreeExp]
           ,[LoveScore]
           ,[MonsterExp]
           ,[PoultryState]
           ,[CountDownTime]
           ,[TreeCostExp])
     VALUES
           (@FarmID
           ,@PayFieldMoney
           ,@PayAutoMoney
           ,@AutoPayTime
           ,@AutoValidDate
           ,@VipLimitLevel
           ,@FarmerName
           ,@GainFieldId
           ,@MatureId
           ,@KillCropId
           ,@isAutoId
           ,@isFarmHelper
           ,@buyExpRemainNum
           ,@isArrange
           ,@TreeLevel
           ,@TreeExp
           ,@LoveScore
           ,@MonsterExp
           ,@PoultryState
           ,@CountDownTime
           ,@TreeCostExp)
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
