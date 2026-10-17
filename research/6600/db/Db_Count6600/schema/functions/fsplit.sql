-- SQL_TABLE_VALUED_FUNCTION dbo.fsplit (modified 2009-04-28T14:24:57.590)
create   function   fsplit(@str   varchar(8000))   
  returns   @tb   table(ch   varchar(8000))   
  as   
  begin   
  declare   @i   int   
  set   @str=@str+','   
  set   @i=charindex(',',@str)   
  while   @i>0   
  begin   
  insert   into   @tb   values(left(@str,@i-1))   
  set   @str=substring(@str,@i+1,8000)   
  set   @i=charindex(',',@str)   
  end   
  return   
  end   

GO
