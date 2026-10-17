-- SQL_SCALAR_FUNCTION dbo.f_stradd (modified 2025-11-03T04:46:08.190)
create   function   f_stradd(@psid   int)  
  returns   varchar(8000)  
  as  
  begin  
              declare   @str   varchar(8000)  
              set   @str=''  
              select   @str=@str+','+name   from   A   where   psid=@psid  
              return   stuff(@str,1,1,'')  
  end  

GO
