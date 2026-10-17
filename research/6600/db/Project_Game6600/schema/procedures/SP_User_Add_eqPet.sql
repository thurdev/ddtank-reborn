-- SQL_STORED_PROCEDURE dbo.SP_User_Add_eqPet (modified 2015-01-25T14:04:48.167)
CREATE PROCEDURE [dbo].[SP_User_Add_eqPet]
            @ID int output
		   ,@UserID int
           ,@PetID int
           ,@eqType int
           ,@eqTemplateID int
           ,@startTime datetime
           ,@ValidDate int
           ,@IsExit bit
            
AS
BEGIN

    INSERT INTO [dbo].[Pet_Equip_Data]
           ([UserID]
           ,[PetID]
           ,[eqType]
           ,[eqTemplateID]
           ,[startTime]
           ,[ValidDate]
           ,[IsExit])
     VALUES
           (@UserID
           ,@PetID
           ,@eqType
           ,@eqTemplateID
           ,@startTime
           ,@ValidDate
           ,@IsExit)
           
    select @@identity as 'identity'
    set @ID=@@identity  
      
	if(@@error <> 0)
	begin
	  return 1
	end
END

GO
