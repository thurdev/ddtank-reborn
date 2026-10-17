-- SQL_STORED_PROCEDURE dbo.SP_MountData_Add (modified 2015-01-25T14:04:48.667)
CREATE PROCEDURE [dbo].[SP_MountData_Add]
			@ID int output 
           ,@UserID int
           ,@curUseHorse int
           ,@curLevel int
           ,@curExp int
           ,@curHasSkill nvarchar(1024)
           ,@horsePicCherish nvarchar(1024)
AS
BEGIN

    INSERT INTO [dbo].[Mount_Data]
           ([UserID]
           ,[curUseHorse]
           ,[curLevel]
           ,[curExp]
           ,[curHasSkill]
           ,[horsePicCherish])
     VALUES
           (@UserID
           ,@curUseHorse
           ,@curLevel
           ,@curExp
           ,@curHasSkill
           ,@horsePicCherish)
           
	select @@identity as 'identity'
     set @ID=@@identity  
       
	if(@@error <> 0)
	begin
	  return 1
	end
END

GO
