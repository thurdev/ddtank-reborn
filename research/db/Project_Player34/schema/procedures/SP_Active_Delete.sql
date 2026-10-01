-- SQL_STORED_PROCEDURE dbo.SP_Active_Delete (modified 2022-01-26T06:05:26.603)

CREATE  PROCEDURE [dbo].[SP_Active_Delete]			
AS
TRUNCATE TABLE [Project_Game34].[dbo].[Active]
TRUNCATE TABLE [Project_Game34].[dbo].[Active_Award]
RETURN 0

GO
