-- SQL_STORED_PROCEDURE dbo.SP_Users_GemStones_Add (modified 2022-02-20T07:41:39.257)
CREATE PROCEDURE [dbo].[SP_Users_GemStones_Add]
            @ID int output 
		   ,@UserID int
           ,@FigSpiritId int
           ,@FigSpiritIdValue nvarchar(50)  
           ,@EquipPlace int        
           
AS
BEGIN

    -- Insert statements for procedure here
    INSERT INTO [dbo].[Sys_User_Gemstone]
           ([UserID]
           ,[FigSpiritId]
           ,[FigSpiritIdValue]
           ,[EquipPlace])
     VALUES
           (@UserID
           ,@FigSpiritId
           ,@FigSpiritIdValue
           ,@EquipPlace)
    select @@identity as 'identity'
    set @ID=@@identity    
	if(@@error <> 0)
	begin
	  return 1
	end
END

GO
