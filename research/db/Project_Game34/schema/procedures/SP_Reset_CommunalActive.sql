-- SQL_STORED_PROCEDURE dbo.SP_Reset_CommunalActive (modified 2021-06-04T01:29:18.457)




-- =============================================
-- Author:		<Author,,Name>
-- Create date: <Create Date,,>
-- Description:	<Description,,>
-- =============================================
CREATE PROCEDURE [dbo].[SP_Reset_CommunalActive]
@ActiveID int,
@IsReset bit
AS
BEGIN

UPDATE [dbo].[Communal_Active]
   SET [IsReset] = @IsReset
 WHERE [ActiveID] = @ActiveID
 
END








GO
