-- SQL_STORED_PROCEDURE dbo.SP_Sys_Eat_Pets_Update (modified 2021-06-04T05:18:35.760)

CREATE  PROCEDURE [dbo].[SP_Sys_Eat_Pets_Update]
   @ID int,
   @UserID int,
   @weaponExp int,
   @weaponLevel int,
   @clothesExp int,
   @clothesLevel int,
   @hatExp int,
   @hatLevel int
AS
SET XACT_ABORT ON
BEGIN TRAN
UPDATE [dbo].[Sys_Eat_Pets]
   SET [UserID] = @UserID
      ,[weaponExp] = @weaponExp
      ,[weaponLevel] = @weaponLevel
      ,[clothesExp] = @clothesExp
      ,[clothesLevel] = @clothesLevel
      ,[hatExp] = @hatExp
      ,[hatLevel] = @hatLevel
WHERE ID = @ID
IF @@ERROR <> 0
BEGIN
    ROLLBACK TRAN
    RETURN @@ERROR
END
COMMIT TRAN
SET XACT_ABORT OFF
RETURN 0

GO
