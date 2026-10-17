-- SQL_STORED_PROCEDURE dbo.SP_Sys_User_Pet_Form_Add (modified 2015-01-25T14:04:48.187)
CREATE  PROCEDURE [dbo].[SP_Sys_User_Pet_Form_Add]
   @ID int output,
   @UserID int,
   @PetsID int,
   @ActivePets nvarchar (1024)
AS
DECLARE @count int
SELECT @count=COUNT(*) FROM [dbo].Sys_User_Pet_Form WHERE [UserID] = @UserID
IF @count >0
BEGIN
    RETURN 1
END
SET XACT_ABORT ON
BEGIN TRAN
INSERT INTO [dbo].[Sys_User_Pet_Form]
         (UserID
         ,PetsID
         ,ActivePets)
    VALUES
         (@UserID
         ,@PetsID
         ,@ActivePets)
    select @@identity as 'identity'
    set @ID=@@identity    
	if(@@error <> 0)
	begin
	  return 1
	end
IF @@ERROR <> 0
BEGIN
    ROLLBACK TRAN
    RETURN @@ERROR
END
COMMIT TRAN
SET XACT_ABORT OFF
RETURN 0

GO
