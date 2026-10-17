-- SQL_STORED_PROCEDURE dbo.SP_Server_Equip (modified 2015-01-25T14:04:48.683)
Create PROCEDURE [dbo].[SP_Server_Equip]
as
select value from Server_config 
where [Name]='Equip'

GO
