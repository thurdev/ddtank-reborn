-- SQL_STORED_PROCEDURE dbo.SP_UserRank_Add (modified 2015-03-25T13:37:12.410)

CREATE PROCEDURE [dbo].[SP_UserRank_Add]			
            @ID int output
           ,@UserID int
           ,@Name nvarchar(500)
           ,@Attack int
           ,@Defence int
           ,@Luck int
           ,@Agility int
           ,@HP int
           ,@Damage int
           ,@Guard int
           ,@BeginDate datetime
           ,@Validate int
           ,@IsExit bit
           ,@NewTitleID int
           ,@EndDate datetime
AS
BEGIN
    -- Insert statements for procedure here
    INSERT INTO [dbo].[Sys_User_Rank]
           ([UserID]
           ,[NewTitleID]
           ,[Name]
           ,[Attack]
           ,[Defence]
           ,[Luck]
           ,[Agility]
           ,[HP]
           ,[Damage]
           ,[Guard]
           ,[BeginDate]
           ,[EndDate]
           ,[Validate]
           ,[IsExit])
     VALUES
           (@UserID
           ,@NewTitleID
           ,@Name
           ,@Attack
           ,@Defence
           ,@Luck 
           ,@Agility
           ,@HP
           ,@Damage
           ,@Guard
           ,@BeginDate
           ,@EndDate
           ,@Validate
           ,@IsExit)
	select @@identity as 'identity'
    set @ID=@@identity 
	return 0
	
	if(@@error <> 0)
	begin
	  return 1
	end

END


GO
