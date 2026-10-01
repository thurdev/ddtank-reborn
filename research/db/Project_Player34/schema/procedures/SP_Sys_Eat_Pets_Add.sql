-- SQL_STORED_PROCEDURE dbo.SP_Sys_Eat_Pets_Add (modified 2021-06-04T05:18:35.750)

CREATE  PROCEDURE [dbo].[SP_Sys_Eat_Pets_Add]
   @ID int output,
   @UserID int,
   @weaponExp int,
   @weaponLevel int,
   @clothesExp int,
   @clothesLevel int,
   @hatExp int,
   @hatLevel int
AS
DECLARE @count int
SELECT @count=COUNT(*) FROM [dbo].Sys_Eat_Pets WHERE UserID = @UserID
IF @count >0
BEGIN
    RETURN 1
END
SET XACT_ABORT ON
BEGIN TRAN
INSERT INTO [dbo].[Sys_Eat_Pets]
         (UserID
         ,weaponExp
         ,weaponLevel
         ,clothesExp
         ,clothesLevel
         ,hatExp
         ,hatLevel)
    VALUES
         (@UserID
         ,@weaponExp
         ,@weaponLevel
         ,@clothesExp
         ,@clothesLevel
         ,@hatExp
         ,@hatLevel)
    SELECT @@IDENTITY AS 'IDENTITY'
    SET @ID=@@IDENTITY
IF @@ERROR <> 0
BEGIN
    ROLLBACK TRAN
    RETURN @@ERROR
END
COMMIT TRAN
SET XACT_ABORT OFF
RETURN 0

GO
