-- SQL_STORED_PROCEDURE dbo.SP_Users_Treasure_Add (modified 2015-01-25T14:04:48.400)
CREATE PROCEDURE [dbo].[SP_Users_Treasure_Add]			
           @ID int output 
           ,@UserID int
           ,@NickName nvarchar(50)
           ,@logoinDays int
           ,@treasure int
           ,@treasureAdd int
           ,@friendHelpTimes int
           ,@isEndTreasure bit
           ,@isBeginTreasure bit
           ,@LastLoginDay datetime
           
AS
BEGIN
declare @count int

select @count = isnull(count(*),0) from [dbo].[Sys_User_Treasure] where [UserID] =@UserID
if (@count = 0)
begin
    -- Insert statements for procedure here
    INSERT INTO [dbo].[Sys_User_Treasure]
           ([UserID]
           ,[NickName]
           ,[logoinDays]
           ,[treasure]
           ,[treasureAdd]
           ,[friendHelpTimes]
           ,[isEndTreasure]
           ,[isBeginTreasure]
           ,[LastLoginDay])
     VALUES
           (@UserID
           ,@NickName
           ,@logoinDays
           ,@treasure
           ,@treasureAdd
           ,@friendHelpTimes
           ,@isEndTreasure
           ,@isBeginTreasure
           ,@LastLoginDay)
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
