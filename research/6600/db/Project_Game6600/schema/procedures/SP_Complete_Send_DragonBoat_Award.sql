-- SQL_STORED_PROCEDURE dbo.SP_Complete_Send_DragonBoat_Award (modified 2015-01-26T15:30:22.040)

-- =============================================
-- Author:		<Author,,Name>
-- Create date: <Create Date,,>
-- Description:	<Description,,>
-- =============================================
CREATE PROCEDURE [dbo].[SP_Complete_Send_DragonBoat_Award]
AS
BEGIN
UPDATE [dbo].[Communal_Active]
   SET [IsSendAward] = 0
 WHERE [ActiveID] > 0

END


GO
