-- SQL_STORED_PROCEDURE dbo.SP_Sys_User_Pet_Form_Update (modified 2015-01-25T14:04:48.183)
CREATE  PROCEDURE [dbo].[SP_Sys_User_Pet_Form_Update]
   @ID int,
   @UserID int,
   @PetsID int,
   @ActivePets nvarchar (1024)
AS
SET XACT_ABORT ON
BEGIN TRAN
UPDATE [dbo].[Sys_User_Pet_Form]
   SET [PetsID] = @PetsID
      ,[ActivePets] = @ActivePets
WHERE ID = @ID
IF @@ERROR <> 0
BEGIN
    ROLLBACK TRAN
    RETURN @@ERROR
END
COMMIT TRAN
SET XACT_ABORT OFF
RETURN 0
/*** ***/

GO
